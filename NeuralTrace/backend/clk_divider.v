module clk_divider (
    input  wire clk_in,   // 100MHz input clock
    input  wire rst_n,    // Active-low reset
    output reg  led       // 1Hz output to LED
);

    // 27 bits are needed to hold 50,000,000 (2^26 = 67M)
    reg [26:0] count;

    always @(posedge clk_in or negedge rst_n) begin
        if (!rst_n) begin
            count <= 27'd0;
            led   <= 1'b0;
        end else begin
            if (count == 27'd49_999_999) begin
                count <= 27'd0;
                led   <= ~led; // Toggle LED
            end else begin
                count <= count + 1;
            end
        end
    end

endmodule
