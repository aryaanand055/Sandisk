`timescale 1ns / 1ps
module led_blinker_tb_reset;
    reg clk;
    reg reset;
    wire led;

    led_blinker #( .BLINK_PERIOD(20) ) uut (
        .clk(clk),
        .reset(reset),
        .led(led)
    );

    initial begin
        clk = 0;
        forever #5 clk = ~clk;
    end

    initial begin
        reset = 1;
        #15 reset = 0;
        #100 reset = 1; // Middle of count
        #25 reset = 0;
        #500 $finish;
    end
endmodule
